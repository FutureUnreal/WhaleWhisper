class ASRProvider:
    def transcribe(self, audio: bytes) -> str:
        raise NotImplementedError
