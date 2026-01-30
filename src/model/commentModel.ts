import mongoose, { InferSchemaType } from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

interface TransformRet {
  _id?: mongoose.Types.ObjectId | string;
  __v?: number;
  id?: string;
  [key: string]: unknown;
}

commentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: TransformRet) => {
    ret.id = typeof ret._id === 'object' ? String(ret._id) : (ret._id as string | undefined);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Comment', commentSchema);
export type CommentType = InferSchemaType<typeof commentSchema>;
