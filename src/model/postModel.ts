import mongoose, { InferSchemaType } from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    mapLink: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfDays: {
      type: Number,
      required: true,
    },
    location: {
      city: {
        type: String,
      },
      country: {
        type: String,
        required: true,
      },
    },
    description: {
      type: String,
      required: true,
    },
    photos: {
      type: [String],
      required: true,
    },
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
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

postSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: TransformRet) => {
    ret.id = typeof ret._id === 'object' ? String(ret._id) : (ret._id as string | undefined);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

export default mongoose.model('Post', postSchema);
export type PostType = InferSchemaType<typeof postSchema>;
