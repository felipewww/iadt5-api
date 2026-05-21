export type ProjectReadModel = {
    id: number;
    name: string;
    customer_name: string;
    date_start: Date;
    date_end: Date;
    cover_document_id: number | null;
    original_key: string | null;
    thumbnail_key: string | null;
    analysis_job_id: string | null;
    analysis_status: string | null;
    favorite: boolean;
    created_at: Date;
    updated_at: Date;
}
