import { io } from "socket.io-client";
import { API } from "../config/api";

const socketUrl = API;

const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true
});

export default socket;
