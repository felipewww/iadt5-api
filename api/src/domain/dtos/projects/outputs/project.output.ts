import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectReadModel } from '@/domain/read-models/projects/project.read-model';

export class ProjectOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiProperty() customerName: string;
    @ApiProperty() dateStart: Date;
    @ApiProperty() dateEnd: Date;
    @ApiPropertyOptional() photoUrl: string | null;
    @ApiPropertyOptional() originalPhotoUrl: string | null;
    @ApiPropertyOptional() analysisJobId: string | null;
    @ApiPropertyOptional() analysisStatus: string | null;
    @ApiProperty() favorite: boolean;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;

    static from(
        readModel: ProjectReadModel,
        photoUrl: string | null,
        originalPhotoUrl: string | null = null,
    ): ProjectOutput {
        const output = new ProjectOutput();
        output.id = readModel.id;
        output.name = readModel.name;
        output.customerName = readModel.customer_name;
        output.dateStart = readModel.date_start;
        output.dateEnd = readModel.date_end;
        output.photoUrl = photoUrl;
        output.originalPhotoUrl = originalPhotoUrl;
        output.analysisJobId = readModel.analysis_job_id;
        output.analysisStatus = readModel.analysis_status;
        output.favorite = readModel.favorite;
        output.createdAt = readModel.created_at;
        output.updatedAt = readModel.updated_at;
        return output;
    }
}
