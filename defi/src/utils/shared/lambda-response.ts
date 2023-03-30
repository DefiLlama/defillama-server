interface IJSON {
  [key: string]: any;
}

interface IResponseOptions {
  body: IJSON;
  statusCode: number;
  allowCORS?: boolean;
  cacheTTL?: number;
  headers?: Headers;
}

export interface IResponse {
  statusCode: number;
  body: string;
  headers?: {
    [key: string]: any;
  };
}

export interface Headers {
  [name: string]: string;
}

function lambdaResponse({
  body,
  statusCode,
  cacheTTL,
  allowCORS = false,
  headers,
}: IResponseOptions) {
  const response: IResponse = {
    statusCode,
    body: JSON.stringify(body),
  };
  response.headers = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (
    allowCORS &&
    response.headers["Access-Control-Allow-Origin"] === undefined
  ) {
    response.headers["Access-Control-Allow-Origin"] = "*";
  }
  if (cacheTTL !== undefined) {
    response.headers["Cache-Control"] = `max-age=${cacheTTL}`;
  }

  response.headers["Content-Type"] = "application/json";

  return response;
}

export function errorResponse(body: {
  message: string;
}) {
  const errorParams = {
    statusCode: 400,
    allowCORS: true,
  };
  return lambdaResponse({
    body,
    ...errorParams,
  });
}

// TTL must be in seconds
export function successResponse(
  json: IJSON,
  cacheTTL?: number,
  headers?: Headers
) {
  return lambdaResponse({
    body: json,
    statusCode: 200,
    allowCORS: true,
    cacheTTL,
    headers,
  });
}

// TTL must be in seconds
export function notFoundResponse(
  json: IJSON,
  cacheTTL?: number,
  headers?: Headers
) {
  return lambdaResponse({
    body: json,
    statusCode: 404,
    allowCORS: true,
    cacheTTL,
    headers,
  });
}

export function acceptedResponse(message: string) {
  return {
    statusCode: 202,
    allowCORS: true,
    body: message
  }
}

export function cache20MinResponse(
  json: IJSON,
) {
  const date = new Date();
  date.setMinutes(20);
  if (date < new Date()) { // we are past the :20 mark, roll over to next hour
    date.setHours(date.getHours() + 1)
  }

  return lambdaResponse({
    body: json,
    statusCode: 200,
    allowCORS: true,
    headers: {
      "Expires": date.toUTCString(),
    },
  });
}

export function corsSuccessResponse(json: IJSON) {
  return lambdaResponse({
    body: json,
    statusCode: 200,
    allowCORS: true,
  });
}

export function getBody(response: string | void | IResponse) {
  if (response instanceof Object) {
    return JSON.parse(response.body);
  }
  throw new Error(
    "response is not of the correct type, this should never happen"
  );
}

export function credentialsCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
  };
}
