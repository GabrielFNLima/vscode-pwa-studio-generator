import {
    window,
    ExtensionContext,
    workspace
} from 'vscode';

import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as  path from 'path';
import { MultiStepInput } from './multiStepInputHelper';
import { camelCase, replacePlaceholders } from './util';

interface State {
    title: string;
    step?: number;
    totalSteps?: number;
    componentName: string;
    uri: any | undefined | any[];
}

export async function createComponent(context: ExtensionContext, uri: any) {

    async function collectInputs() {
        const state = {} as Partial<State>;

        await MultiStepInput.run(input => stepComponentName(input, state));

        return state as State;
    }

    const title = 'PWA studio Generator: Create Component';

    async function stepPackagePath(input: MultiStepInput, state: Partial<State>) {
        await window.showOpenDialog({
            title,
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Choose the directory where you want to create the component.'
        }).then(fileUri => {
            if (fileUri && fileUri[0]) {
                state.uri = fileUri[0];
            }
        });

    }

    async function stepComponentName(input: MultiStepInput, state: Partial<State>) {
        state.componentName = await input.showInputBox({
            title,
            value: state.componentName || '',
            prompt: 'Please provide a name for the component, please try again.',
            validate: validate,
            shouldResume: shouldResume
        });

        if (!uri) {
            return (input: MultiStepInput) => stepPackagePath(input, state);
        }
    }

    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise<boolean>((resolve, reject) => {
            // noop
        });
    }

    async function validate(name: string) {
        // ...validate...
        await new Promise(resolve => setTimeout(resolve, 1000));
        return name.replace(/\s/g, '').length === 0 ? 'Please enter valid Component name.' : undefined;
    }

    const state = await collectInputs();

    if (uri) {
        state.uri = uri;
    }

    if (!state.uri) {
        window.showErrorMessage('You need to configure the path.');
        return;
    }

    const component = await Component.create(state);

    if (component) {
        window.showInformationMessage(`Creating PWA Studio Component: '${state.componentName}'`);
    }

    if (!component) {
        window.showErrorMessage('Unable to create the component.');
    }
}


class Component {
    static isCreateed: boolean;
    static componentDir: string = '';
    static templateDir: string = path.join(__dirname, '../templates/component');

    static async create(state: State) {
        const componentDir = await this.createComponentDir(state.uri, state.componentName);
        const createFiles = await this.cerateFiles(state);
        
        if (componentDir && createFiles) {
            return true;
        } else {
            return false;
        }
    }

    static async createComponentDir(uri: any, compName: string) {
        let contextMenuSourcePath;
        if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
            contextMenuSourcePath = uri.fsPath;
        } else if (uri) {
            contextMenuSourcePath = path.dirname(uri.fsPath);
        } else {
            contextMenuSourcePath = workspace.rootPath;
        }

        let componentDir = contextMenuSourcePath;
        componentDir = `${contextMenuSourcePath}/${compName}`;
        await fse.mkdirsSync(componentDir);

        this.componentDir = componentDir;
        if (!fs.lstatSync(componentDir).isDirectory()) {
            return false;
        }

        return true;
    }

    static async cerateFiles(state: State) {
        const { componentName } = state;
        const componentNameFile = await camelCase(componentName);
        const templates = [
            {
                template: `${this.templateDir}/component.module.css.template`,
                filename: `${this.componentDir}/${componentNameFile}.module.css`,
                variables: {}
            },
            {
                template: `${this.templateDir}/component.js.template`,
                filename: `${this.componentDir}/${componentNameFile}.js`,
                variables: {
                    componentNameFile,
                    componentName
                }
            },
            {
                template: `${this.templateDir}/index.js.template`,
                filename: `${this.componentDir}/index.js`,
                variables: {
                    componentNameFile
                }
            }
        ];

        try {
            const filesCreated = await Promise.all(templates.map(async (template) => {
                const content = await replacePlaceholders(template.template, template.variables);

                await fs.writeFile(template.filename, content, () => { });

                return fs.existsSync(template.filename);
            }));

            return filesCreated.every(f => f === true);
        } catch (error: any) {
            console.error(`Error: ${error.message}`);
            return false;
        }
    }
}