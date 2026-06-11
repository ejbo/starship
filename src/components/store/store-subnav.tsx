import { getWishlistCount } from "@/lib/wishlist-service";
import { SubnavBar } from "./subnav-bar";

/** 商店子导航条：服务端取心愿单数量，交给玻璃悬浮的客户端条渲染。 */
export async function StoreSubnav() {
  const wishCount = await getWishlistCount();
  return <SubnavBar wishCount={wishCount} />;
}
