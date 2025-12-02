import { useParams } from "wouter";
import RideFilterForm from "./form";

export default function EditRideFilterPage() {
  const params = useParams<{ id: string }>();
  const filterId = params.id ? parseInt(params.id) : undefined;
  
  return <RideFilterForm filterId={filterId} />;
}