class TTSProvider:
    def synthesize(self, text: str) -> bytes:
        raise NotImplementedError
