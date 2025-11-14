import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InterestStorage } from '$lib/storage';
import type { Interest, InterestCreateInput, ApiResponse } from '$lib/types';

// GET /api/interests - List all interests
export const GET: RequestHandler = async () => {
  try {
    const interests = await InterestStorage.getAll();
    return json<ApiResponse<Interest[]>>({
      success: true,
      data: interests
    });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return json<ApiResponse<Interest[]>>(
      {
        success: false,
        error: 'Failed to fetch interests'
      },
      { status: 500 }
    );
  }
};

// POST /api/interests - Create a new interest
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: InterestCreateInput = await request.json();
    
    // Validation
    if (!body.name || !body.searchTerms || body.searchTerms.length === 0) {
      return json<ApiResponse<Interest>>(
        {
          success: false,
          error: 'Name and at least one search term are required'
        },
        { status: 400 }
      );
    }

    const newInterest = await InterestStorage.create({
      name: body.name,
      description: body.description,
      searchTerms: body.searchTerms,
      monitorUrls: body.monitorUrls || [],
      contentTypes: body.contentTypes || ['general'],
      active: true
    });

    return json<ApiResponse<Interest>>(
      {
        success: true,
        data: newInterest
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create interest:', error);
    return json<ApiResponse<Interest>>(
      {
        success: false,
        error: 'Failed to create interest'
      },
      { status: 500 }
    );
  }
};
