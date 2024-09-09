import { existsSync } from 'fs';
import { join } from 'path';
import SupernotePlugin from "./main";
import { Setting } from 'obsidian';


/** Settings for Supernote's plugin daily note importer */
export interface DailyNoteImporterSettings {
	/** The location of Supernote daily note files  */
	dailyNotesPath?: string,
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
				.setValue(plugin.settings.dailyNotesPath ?? '')
				.onChange(async (value) => {
					plugin.settings.dailyNotesPath = value;
					await plugin.saveSettings();
				})
			);
}

export function addDailyNoteImporterCommand(plugin: SupernotePlugin) {
	console.log('Adding daily note importer command');
	plugin.addCommand({
		id: 'import-supernote-daily-note',
		name: 'Import Daily Note from Supernote',
		checkCallback(checking) {
			const filePath = join(plugin.settings.dailyNotesPath ?? '', `${getYYYYMMDD()}.note`);
			const fileExists = existsSync(filePath);

			if (checking || !fileExists) {
				return fileExists;
			}
		
		},
  })
}
