import { Injectable, Inject } from "@nestjs/common";
import { Memphis } from "../memphis"

@Injectable({})
export class MemphisService extends Memphis {}