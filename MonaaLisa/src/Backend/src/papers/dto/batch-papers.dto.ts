import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

// The frontend sends ids in chunks of 500. A batch returns every column, so
// it is held to the same bound as a full page of GET /papers.
export const MAX_BATCH_IDS = 500;

export class BatchPapersDto {
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_IDS)
  @IsString({ each: true })
  entryIds: string[] = [];
}
