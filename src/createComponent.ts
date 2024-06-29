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
            prompt: 'Name of the Component.',
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
        window.showErrorMessage('You need to configure the path, please try again.');
        return;
    }

    await Component.create(state);
    window.showInformationMessage(`Creating PWA Studio Component: '${state.componentName}'`);
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

        const config = workspace.getConfiguration('devgfnl.pwaStudio.component');

        replacePlaceholders(config.componentCssTemplate, {});
        const templates = [
            {
                template: !config.componentCssTemplate ? `${this.templateDir}/component.module.css.template` : config.componentCssTemplate,
                filename: `${this.componentDir}/${componentNameFile}.module.css`,
                variables: {}
            }
        ];

        if(config.useTypescript) {
            templates.push(
                {
                    template: !config.componentTemplate ? `${this.templateDir}/component.tsx.template` : !config.componentTemplate,
                    filename: `${this.componentDir}/${componentNameFile}.tsx`,
                    variables: {
                        componentNameFile,
                        componentName
                    }
                },
                {
                    template: !config.indexTemplate ? `${this.templateDir}/index.tsx.template` : config.indexTemplate,
                    filename: `${this.componentDir}/index.tsx`,
                    variables: {
                        componentNameFile
                    }
                },
                {
                    template:  `${this.templateDir}/component.module.css.d.ts.template`,
                    filename: `${this.componentDir}/${componentNameFile}.module.css.d.ts`,
                    variables: {}
                }
            );
        }

        if(!config.useTypescript) {
            templates.push(
                {
                    template: !config.componentTemplate ? `${this.templateDir}/component.js.template` : !config.componentTemplate,
                    filename: `${this.componentDir}/${componentNameFile}.js`,
                    variables: {
                        componentNameFile,
                        componentName
                    }
                },
                {
                    template: !config.indexTemplate ? `${this.templateDir}/index.js.template` : config.indexTemplate,
                    filename: `${this.componentDir}/index.js`,
                    variables: {
                        componentNameFile
                    }
                }
            );
        }

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