import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ActualCostItemDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsInt()
  @Min(0)
  amount: number;
}

export class AddActualCostsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActualCostItemDto)
  items: ActualCostItemDto[];
}
