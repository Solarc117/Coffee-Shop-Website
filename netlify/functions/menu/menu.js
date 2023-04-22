import { MongoClient } from 'mongodb'

const { URI, DATABASE, PRODUCT_COLLECTION } = process.env,
  clientPromise = new MongoClient(URI, {
    appName: 'Xin Chào Coffee',
    maxPoolSize: 1,
    maxIdleTimeMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 20_000,
    keepAlive: true,
  })

export const handler = async function (event, context) {
  const { httpMethod } = event

  if (httpMethod !== 'GET')
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'not found' }),
    }

  try {
    const database = (await clientPromise).db(DATABASE),
      collection = database.collection(PRODUCT_COLLECTION),
      cursor = await collection.aggregate([
        {
          $group: {
            _id: '$category',
            products: { $push: '$$ROOT' },
          },
        },
        {
          $addFields: {
            category: '$_id',
          },
        },
      ]),
      products = await cursor.toArray()

    await clientPromise.close()

    return {
      statusCode: 200,
      body: JSON.stringify(products),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.toString(),
      }),
    }
  }
}
