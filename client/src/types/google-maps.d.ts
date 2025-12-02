declare namespace google {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    namespace places {
      interface PlaceGeometry {
        location: google.maps.LatLng;
        viewport?: google.maps.LatLngBounds;
      }

      interface PlaceResult {
        place_id?: string;
        formatted_address?: string;
        name?: string;
        geometry?: PlaceGeometry;
      }

      enum PlacesServiceStatus {
        OK,
        UNKNOWN_ERROR,
        ZERO_RESULTS,
        OVER_QUERY_LIMIT,
        REQUEST_DENIED,
        INVALID_REQUEST
      }

      interface FindPlaceFromQueryRequest {
        query: string;
        fields: string[];
      }

      interface TextSearchRequest {
        query: string;
        bounds?: LatLngBounds;
        location?: LatLng;
        radius?: number;
        region?: string;
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields: string[];
      }

      class PlacesService {
        constructor(attributionNode: HTMLElement);
        
        findPlaceFromQuery(
          request: FindPlaceFromQueryRequest,
          callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
        ): void;
        
        textSearch(
          request: TextSearchRequest,
          callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
        ): void;
        
        getDetails(
          request: PlaceDetailsRequest,
          callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
        ): void;
      }
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      contains(latLng: LatLng): boolean;
      extend(latLng: LatLng): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toJSON(): object;
      toSpan(): LatLng;
      toString(): string;
      union(other: LatLngBounds): LatLngBounds;
    }
  }
}