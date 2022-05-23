const crypto = require('crypto');
const S3 = require('aws-sdk/clients/s3');

const BucketFolderEnum = {
  avatar: 'avatar',
  event: 'event',
  video: 'video',
  news: 'news',
};

const FILE_PERMISSION = 'public-read';

const hashingMd5FileName = (filename) => {
  return crypto
    .createHash('md5')
    .update(filename + Date.now())
    .digest('hex');
};

class FileRepository {
  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_S3_BUCKET_REGION,
    });
  }

  uploadFolder = (folder, BucketFolderEnum) => {
    return folder + '/' + BucketFolderEnum + '/';
  };

  uploadAvatarImage = (file, serviceFolder = '') => {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key:
        this.uploadFolder(serviceFolder, BucketFolderEnum.avatar) +
        hashingMd5FileName(file.originalname),
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: FILE_PERMISSION,
    };
    return this.s3.upload(params).promise();
  };
}

module.exports = FileRepository;
