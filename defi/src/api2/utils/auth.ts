import * as HyperExpress from "hyper-express";
import { errorResponse, errorWrapper as ew } from "../routes/utils";

interface SubscriptionResponse {
  subscription: {
    status: string;
    type: string;
    user_id: string;
    [key: string]: any;
  };
}

async function validateSubscriptionType(authHeader: string, subscriptionType: string): Promise<{ success: boolean; error?: string; statusCode?: number; data?: SubscriptionResponse }> {
  const response = await fetch('https://auth.llama.fi/subscription/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      subscriptionType
    })
  });

  if (!response.ok) {
    return {
      success: false,
      error: response.status === 401 ? 'Invalid or expired token' : `Auth service error: ${response.status}`,
      statusCode: response.status
    };
  }

  const data: SubscriptionResponse = await response.json();
  
  if (!data.subscription) {
    return {
      success: false,
      error: 'Invalid subscription response',
      statusCode: 500
    };
  }

  if (data.subscription.status !== 'active') {
    return {
      success: false,
      error: 'Subscription is not active',
      statusCode: 403
    };
  }

  return { success: true, data };
}

export async function validateSubscriptionAuth(authHeader: string): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid Authorization header. Must be: Bearer <token>',
        statusCode: 401
      };
    }

    let result = await validateSubscriptionType(authHeader, 'llamafeed');
    
    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
      statusCode: result.statusCode || 401
    };

  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      success: false,
      error: 'Authentication service unavailable',
      statusCode: 503
    };
  }
}

export function authWrapper(routeHandler: (req: HyperExpress.Request, res: HyperExpress.Response) => Promise<any>) {
  return ew(async (req: HyperExpress.Request, res: HyperExpress.Response) => {
    const authHeader = req.headers.authorization;
    const internalKey = req.headers['x-internal-key'];
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
      return routeHandler(req, res);
    }

    const authResult = await validateSubscriptionAuth(authHeader);
    
    if (!authResult.success) {
      return errorResponse(res, authResult.error, { statusCode: authResult.statusCode || 401 });
    }

    return routeHandler(req, res);
  });
}