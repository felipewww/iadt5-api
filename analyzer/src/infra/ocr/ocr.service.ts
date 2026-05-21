import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { config } from '@/infra/config';

export interface OcrPage {
    page_number: number;
    text: string;
}

export interface OcrResult {
    filename: string;
    file_type: 'pdf' | 'image';
    total_pages: number;
    pages: OcrPage[];
    full_text: string;
}

@Injectable()
export class OcrService {
    constructor(private readonly httpService: HttpService) {}

    async extract(fileBuffer: Buffer, filename: string, mimeType: string): Promise<OcrResult> {
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);

        const { data } = await firstValueFrom(
            this.httpService.post<OcrResult>(`${config.ocrServiceUrl}/ocr/extract`, form),
        );

        return data;
    }
}
