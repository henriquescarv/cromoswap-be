const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/environment');

const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

/**
 * Gera uma pre-signed URL temporária para um objeto do S3.
 * Aceita tanto a chave do objeto (ex: "Alb_DragonBall.jpg")
 * quanto a URL completa (ex: "https://bucket.s3.region.amazonaws.com/Alb_DragonBall.jpg").
 */
const getSignedImageUrl = async (imageKey) => {
  if (!imageKey) return null;

  const key = imageKey.startsWith('http')
    ? imageKey.split('.amazonaws.com/')[1]
    : imageKey;

  const command = new GetObjectCommand({
    Bucket: env.aws.bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  console.log(`[S3] key="${key}" → ${url.substring(0, 80)}...`);
  return url;
};

module.exports = { getSignedImageUrl };
