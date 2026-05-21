import * as fs from 'fs';
import * as path from 'path';

export interface IManifest {
    tenatId: number;
    tenantName: string;
    projectId: number;
    projectName: string;
    version: string;
    uid: string;
}

export const manifest: IManifest = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'manifest.json'), 'utf-8')
);
