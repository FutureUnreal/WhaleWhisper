import asyncio
import json
import os
import uuid

import websockets


async def main() -> None:
    ws_url = os.getenv("WS_URL", "ws://localhost:8090/ws")
    user_id = os.getenv("USER_ID", "whale")
    session_id = str(uuid.uuid4())
    profile_id = os.getenv("PROFILE_ID", "whale-learning-assistant")

    async with websockets.connect(ws_url) as websocket:
        await websocket.send(
            json.dumps(
                {
                    "type": "session.start",
                    "payload": {
                        "session_id": session_id,
                        "user_id": user_id,
                        "profile_id": profile_id,
                    },
                }
            )
        )

        await websocket.send(
            json.dumps(
                {
                    "type": "user.text",
                    "payload": {
                        "session_id": session_id,
                        "user_id": user_id,
                        "text": "Explain Newton's second law in one sentence.",
                    },
                }
            )
        )

        while True:
            message = await websocket.recv()
            payload = json.loads(message)
            print(payload)
            if payload.get("type") == "llm.final":
                break


if __name__ == "__main__":
    asyncio.run(main())
