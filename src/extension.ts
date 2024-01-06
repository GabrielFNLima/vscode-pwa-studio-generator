/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, ExtensionContext } from 'vscode';
import { multiStepInput } from './createExtension';
import { createComponent } from './createComponent';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand(
		'extension.createExtension',
		async (uri) => multiStepInput(context, uri).catch(console.error)
	));

	context.subscriptions.push(commands.registerCommand(
		'extension.createComponent',
		async (uri) => createComponent(context, uri).catch(console.error)
	));
}
