export type ModelDocument = {
    id: number;
    original_key: string;
    thumbnail_key: string | null;
    mime_type: string;
    extension: string;
    size_bytes: number;
    created_at: Date;
};
