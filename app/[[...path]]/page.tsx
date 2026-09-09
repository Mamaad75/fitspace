import { requireChatGPTUser } from "../chatgpt-auth";
import GymApp from "../gym-app";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireChatGPTUser("/");
  return <GymApp displayName={user.displayName} />;
}
