import { io } from "socket.io-client";

const socketUrl =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true
});

export default socket;
