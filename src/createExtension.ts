import {
	window,
	ExtensionContext,
	workspace
} from 'vscode';

import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as  path from 'path';
import { MultiStepInput } from './multiStepInputHelper';
import { replacePlaceholders } from './util';

interface State {
	title: string;
	step: number;
	totalSteps: number;
	packageName: string;
	packagePath: any | undefined;
	description: string;
	author: string;
}

export async function multiStepInput(context: ExtensionContext, uri: any) {

	async function collectInputs() {
		const state = {} as Partial<State>;
		if (uri) {
			state.packagePath = uri;
		}
		if (uri) {
			await MultiStepInput.run(input => stepPackageName(input, state));
		}
		if (!uri) {
			await MultiStepInput.run(input => stepPackagePath(input, state));
		}
		return state as State;
	}

	const title = 'PWA studio Generator: Create Extension';

	async function stepPackagePath(input: MultiStepInput, state: Partial<State>) {
		await window.showOpenDialog({
			title,
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Choose the directory where you want to create the extension.'
		}).then(fileUri => {
			if (fileUri && fileUri[0]) {
				state.packagePath = fileUri[0];
			}
		});

		return (input: MultiStepInput) => stepPackageName(input, state);
	}

	async function stepPackageName(input: MultiStepInput, state: Partial<State>) {
		state.packageName = await input.showInputBox({
			title,
			step: 2,
			totalSteps: 4,
			value: state.packageName || '',
			prompt: 'Short name of the project to put in the package.json "name" field',
			validate: validatePackageName,
			shouldResume: shouldResume
		});

		return (input: MultiStepInput) => stepAuthor(input, state);
	}

	async function stepAuthor(input: MultiStepInput, state: Partial<State>) {
		state.author = await input.showInputBox({
			title,
			step: 3,
			totalSteps: 4,
			value: state.author || '',
			prompt: 'Name of the author to put in the package.json "author" field',
			validate: validate,
			shouldResume: shouldResume,
			placeholder: 'Ex.: John Wick <jonh.wick@dev.com> '
		});

		return (input: MultiStepInput) => stepDescription(input, state);
	}

	async function stepDescription(input: MultiStepInput, state: Partial<State>) {
		state.description = await input.showInputBox({
			title,
			step: 4,
			totalSteps: 4,
			value: state.description || '',
			prompt: 'Description to put in the package.json "description" field',
			validate: validate,
			shouldResume: shouldResume
		});
	}

	function shouldResume() {
		return new Promise<boolean>((resolve, reject) => {
			// noop
		});
	}

	async function validate(string: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return string.replace(/\s/g, '').length === 0 ? 'Please input a valid string.' : undefined;
	}

	async function validatePackageName(name: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		const regex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

		if (!regex.test(name)) {
			return 'Please input a valid package name. Ex.: package-name-example, packagenameexample or @package/package-name-example ';
		}
	}

	const state = await collectInputs();

	if (!state.packagePath) {
		window.showErrorMessage('You need to configure the path, please try again.');
		return;
	}

	await Extension.create(state);
	window.showInformationMessage(`Creating PWA Studio Extension: '${state.packageName}'`);
}

class Extension {
	static templateDir: string = path.join(__dirname, '../templates/extension');

	static async create(state: State) {
		const createFolders = await this.createFolders(state.packagePath, state.packageName);
		const createFiles = await this.cerateFiles(state);

		if (createFolders && createFiles) {
			return true;
		} else {
			return false;
		}
	}

	static async createFolders(uri: any, packageName: string): Promise<boolean> {
		const pathExtension = await this.pathExtension(uri, packageName);

		const folders = [
			'i18n',
			'lib',
			'lib/components',
			'lib/targets',
		];

		const folderCreated = await Promise.all(folders.map(async (folder, index) => {
			const completePath = `${pathExtension}/${folder}`;

			await fse.mkdirsSync(completePath);
			return fs.existsSync(completePath);
		}));

		return folderCreated.every(f => f === true);
	}


	static async cerateFiles(state: State) {
		const { packageName, packagePath, description, author } = state;
		const pathExtension = await this.pathExtension(packagePath, packageName);
		const config = workspace.getConfiguration('devgfnl.pwaStudio.extension');

		const templates = [
			{
				template: `${this.templateDir}/i18n/en_US.json.template`,
				filename: `${pathExtension}/i18n/en_US.json`,
				variables: {}
			},
			{
				template: `${this.templateDir}/lib/targets/componentOverrideMapping.js.template`,
				filename: `${pathExtension}/lib/targets/componentOverrideMapping.js`,
				variables: {}
			},
			{
				template: `${this.templateDir}/lib/targets/intercept.js.template`,
				filename: `${pathExtension}/lib/targets/intercept.js`,
				variables: {}
			},
			{
				template: `${this.templateDir}/lib/targets/moduleOverrideWebpackPlugin.js.template`,
				filename: `${pathExtension}/lib/targets/moduleOverrideWebpackPlugin.js`,
				variables: {}
			},
			{
				template: `${this.templateDir}/lib/index.js.template`,
				filename: `${pathExtension}/lib/index.js`,
				variables: {}
			},
			{
				template: !config.editorconfigTemplate ? `${this.templateDir}/.editorconfig.template` : config.editorconfigTemplate,
				filename: `${pathExtension}/.editorconfig`,
				variables: {}
			},
			{
				template: !config.eslintrcTemplate ? `${this.templateDir}/.eslintrc.js.template` : config.eslintrcTemplate,
				filename: `${pathExtension}/.eslintrc.js`,
				variables: {}
			},
			{
				template: !config.eslintrcTemplate ? `${this.templateDir}/.gitignore.template` : config.gitignoreTemplate,
				filename: `${pathExtension}/.gitignore`,
				variables: {}
			},
			{
				template: !config.jestConfigTemplate ? `${this.templateDir}/jest.config.js.template` : config.jestConfigTemplate,
				filename: `${pathExtension}/jest.config.js`,
				variables: {}
			},
			{
				template: `${this.templateDir}/package.json.template`,
				filename: `${pathExtension}/package.json`,
				variables: {
					packageName,
					author,
					description
				}
			},
			{
				template: !config.prettierConfigTemplate ? `${this.templateDir}/prettier.config.js.template` : config.prettierConfigTemplate,
				filename: `${pathExtension}/prettier.config.js`,
				variables: {}
			}
		];

		if (config.createReadme === undefined || config.createReadme === true) {
			templates.push({
				template: !config.readmeTemplate ? `${this.templateDir}/README.md.template` : config.readmeTemplate,
				filename: `${pathExtension}/README.md`,
				variables: {}
			});
		}

		const openPackageJson = `${pathExtension}/package.json`;

		try {
			const filesCreated = await Promise.all(templates.map(async (template) => {
				const content = await replacePlaceholders(template.template, template.variables);

				await fs.writeFile(template.filename, content, () => { });
				return fs.existsSync(template.filename);
			}));

			if (fs.existsSync(openPackageJson)) {
				workspace.openTextDocument(openPackageJson).then(doc => {
					window.showTextDocument(doc);
				});
			}

			return filesCreated.every(f => f === true);
		} catch (error: any) {
			console.error(`Error: ${error.message}`);
			return false;
		}
	}

	static async pathExtension(uri: any, packageName: string) {
		let pathExtension: any;
		if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
			pathExtension = uri.fsPath;
		} else if (uri) {
			pathExtension = path.dirname(uri.fsPath);
		} else {
			pathExtension = workspace.rootPath;
		}
		return `${pathExtension}/${packageName}`;
	}
}