import { useMenuContext } from "../context";
import { Game } from "./game";
import { NoGame } from "./no-game";

export const Menu = () => {
  const { gameEvent } = useMenuContext();

  if (!gameEvent) {
    return <NoGame />;
  }

  return <Game />;
};
