import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Google Maps place details endpoint
router.get('/api/maps/get-place-details', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.query;
    
    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const { Client } = require('@googlemaps/google-maps-services-js');
    const client = new Client({});

    const response = await client.placeDetails({
      params: {
        place_id: placeId as string,
        key: process.env.VITE_GOOGLE_MAPS || process.env.GOOGLE_MAPS_API_KEY || '',
        fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types']
      }
    });

    if (response.data.status === 'OK') {
      res.json({
        success: true,
        place: response.data.result
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.data.status
      });
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch place details'
    });
  }
});

export default router;