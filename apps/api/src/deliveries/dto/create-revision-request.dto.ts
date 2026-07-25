import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const REVISION_TYPES = [
  'skin',
  'brightness_color',
  'crop',
  'background',
  'glare',
  'detail',
] as const;

export class CreateRevisionRequestDto {
  @IsString()
  @MinLength(1)
  photoRef: string;

  @IsIn(REVISION_TYPES)
  requestType: (typeof REVISION_TYPES)[number];

  @IsOptional()
  @IsString()
  description?: string;
}
