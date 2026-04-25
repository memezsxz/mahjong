import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class LeaderboardEntryDocument extends Document{
    @Prop({ required: true })
    playerName!: string;

    @Prop({ required: true })
    totalScore!: number;

    @Prop({ required: true, default: Date.now })
    date!: number;
}

export const LeaderboardEntrySchema = SchemaFactory.createForClass(LeaderboardEntryDocument);