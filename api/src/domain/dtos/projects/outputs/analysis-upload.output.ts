import { ApiProperty } from '@nestjs/swagger';

export class AnalysisUploadOutput {
    @ApiProperty() jobId: string;
    @ApiProperty() streamToken: string;

    static from(this: void, jobId: string, streamToken: string): AnalysisUploadOutput {
        const output = new AnalysisUploadOutput();
        output.jobId = jobId;
        output.streamToken = streamToken;
        return output;
    }
}
