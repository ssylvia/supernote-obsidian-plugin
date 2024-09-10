import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import SupernotePlugin, { processSupernoteText } from "./main";
import { Platform, Setting, TAbstractFile } from 'obsidian';
import { SupernoteX } from './supernote-typescript/lib';


/** Settings for Supernote's plugin daily note importer */
export interface DailyNoteImporterSettings {
	/** The location of Supernote daily note files  */
	dailyNotesSupernotePath?: string,
	/** The location of Supernote daily note files  */
	dailyNotesObsidianPath?: string,
}

export const DAILY_NOTE_IMPORTER_DEFAULT_SETTINGS: DailyNoteImporterSettings = {}

function getYYYYMMDD(date = new Date()) {
	const year = date.getFullYear();
	const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add leading zero if needed
	const day = ('0' + date.getDate()).slice(-2); // Add leading zero if needed
	return `${year}${month}${day}`;
  }

// Settings for the daily note importer
export function createDailyNoteImporterSettings(plugin: SupernotePlugin, containerEl: HTMLElement) {
	new Setting(containerEl)
		.setName('Daily Notes Import Path')
		.setDesc('The file path to the folder containing the daily note files exported from Supernote')
		.addText(text => text
			.setPlaceholder('path/to/daily/notes')
			.setValue(plugin.settings.dailyNotesSupernotePath ?? '')
			.onChange(async (value) => {
				plugin.settings.dailyNotesSupernotePath = value;
				await plugin.saveSettings();
			})
		);

	new Setting(containerEl)
		.setName('Daily Notes Path')
		.setDesc('The relative path in your vault where your daily notes will be created')
		.addText(text => text
			.setPlaceholder('path/to/daily/notes')
			.setValue(plugin.settings.dailyNotesObsidianPath ?? '')
			.onChange(async (value) => {
				plugin.settings.dailyNotesObsidianPath = value;
				await plugin.saveSettings();
			})
		);
}

async function onDailyNoteCreate(file: TAbstractFile, plugin: SupernotePlugin) {
	const dailyNoteFile = plugin.app.vault.getFileByPath(file.path);
	if (!dailyNoteFile) {
		return;
	}

	// If the file is not in the daily notes folder, return
	if (dailyNoteFile.parent?.path !== plugin.settings.dailyNotesObsidianPath?.replace(/\/$/, '')) {
		return;
	}

	const dailyNoteDate = new Date(dailyNoteFile.basename);
	const noteFileName = `${getYYYYMMDD(dailyNoteDate)}.note`;
	const srcNoteFile = join(plugin.settings.dailyNotesSupernotePath ?? '', noteFileName);
	const doesNoteExist = existsSync(srcNoteFile);

	// Check if there is a corresponding note file in the Supernote daily notes folder
	if (!doesNoteExist) {
		return;
	}

	// Import Supernote daily note into Obsidian
	const importPath = join(
		plugin.settings.dailyNotesObsidianPath ?? '',
		'Note_Attachments',
		String(dailyNoteDate.getFullYear())
		,
		`${dailyNoteDate.getFullYear()}_${(dailyNoteDate.getMonth() + 1).toString().padStart(2, '0')}_${dailyNoteDate.toLocaleString('default', { month: 'short' })}`
	);
	const content = readFileSync(srcNoteFile);
	try {
		plugin.app.vault.createFolder(importPath)
	} catch {
		// Folder already exists
	}
	// Copy the note file to the import path
	const importedNoteFile = await plugin.app.vault.createBinary(join(importPath, noteFileName), content)

	// Append the note file to the daily note as a resource
	await plugin.app.vault.process(dailyNoteFile, (data) => {
		return data.replace('{{DAILY_NOTE_ATTACHMENT}}', `![[${noteFileName}]]`)
	});

	try {
        const newLeaf = plugin.app.workspace.getLeaf('split', 'vertical')
        newLeaf.openFile(importedNoteFile); 
	} catch {
		// File does not exist
	}

	// Read the content of the daily note file from supernote
	const note = await plugin.app.vault.readBinary(importedNoteFile);
	const sn = new SupernoteX(new Uint8Array(note));

	let ocrText = '';

	for (let i = 0; i < sn.pages.length; i++) {
		if (sn.pages[i].text !== undefined && sn.pages[i].text.length > 0) {
			ocrText += `${processSupernoteText(sn.pages[i].text, plugin.settings)}\n`;
		}
	}

	await plugin.app.vault.process(dailyNoteFile, (data) => {
		return data.replace('{{SUPERNOTE_TEXT}}', ocrText)
	});

}

export function addDailyNotesImporter(plugin: SupernotePlugin) {
	// Should only run in desktop app
	if (!Platform.isDesktopApp) {
		return
	}

	plugin.registerEvent(plugin.app.vault.on('create', async (file) => await onDailyNoteCreate(file, plugin)));
}
