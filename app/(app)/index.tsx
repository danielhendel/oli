import { Redirect } from "expo-router";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

export default function AppIndex() {
  return <Redirect href={CONSUMER_HOME_HREF} />;
}
