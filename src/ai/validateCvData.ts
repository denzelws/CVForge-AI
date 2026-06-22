import { CvData, CvDataSchema } from "../schemas/cvData.schema.js";

export function validateCvData(data: CvData): CvData {
  return CvDataSchema.parse(data);
}
