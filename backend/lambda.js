// lambda.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto"; // Node 18+ has built-in crypto for randomUUID

// DynamoDB setup
const client = new DynamoDBClient({ region: "ap-southeast-1" }); // replace with your region
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "BongoProducts"; // your DynamoDB table name

// CORS headers
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  // Detect HTTP method from Lambda URL
  const method = event.httpMethod || event.requestContext?.http?.method;
  const effectiveMethod = method === "HEAD" ? "GET" : method;

  try {
    // Preflight OPTIONS request
    if (effectiveMethod === "OPTIONS") {
      return { statusCode: 200, headers: CORS_HEADERS, body: "OK" };
    }

    // GET all products
    if (effectiveMethod === "GET") {
      const data = await ddbDocClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      const items = Array.isArray(data.Items) ? data.Items : [];
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      };
    }

    // CREATE product
    if (effectiveMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const newProduct = {
        productId: "bongo-" + crypto.randomUUID(),
        title: body.title,
        description: body.description || "",
        price: Number(body.price) || 0,
        imageUrl: body.imageUrl || "",
        createdAt: new Date().toISOString()
      };

      await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: newProduct }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(newProduct)
      };
    }

    // DELETE product
    if (effectiveMethod === "DELETE") {
      const productId = event.queryStringParameters?.productId;
      if (!productId) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: "productId is required" }) };
      }

      await ddbDocClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { productId } }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Product deleted successfully" })
      };
    }

    // Method not allowed
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ message: "Method Not Allowed" }) };

  } catch (err) {
    console.error("Error in Lambda:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
