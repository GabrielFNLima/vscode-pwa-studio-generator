import * as fs from 'fs';

export async function replacePlaceholders(templateFileName: string, replacements: any) {
    try {
        if (Object.keys(replacements).length === 0) {

            return await fs.readFileSync(templateFileName).toString();
        }

        let content = await fs.readFileSync(templateFileName).toString();

        Object.keys(replacements).forEach(key => {
            const pattern = new RegExp(`{${key}}`, 'g');
            content = content.replace(pattern, replacements[key]);
        });

        return content;
    } catch (error: any) {
        throw new Error(`Erro: ${error.message}`);
    }
}

export async function camelCase(str: string): Promise<string> {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}