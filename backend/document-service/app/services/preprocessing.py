from io import BytesIO

import cv2
import numpy as np
from PIL import Image


class PreprocessingError(Exception):
    """Raised when document preprocessing fails."""


class DocumentPreprocessor:
    """
    Preprocess document images before OCR.

    The preprocessing pipeline is designed primarily for:
    - scanned medical documents
    - phone-camera photographs
    - printed reports
    - prescriptions
    """

    def preprocess(self, file_data: bytes) -> bytes:
        """
        Preprocess an image and return the processed image as PNG bytes.
        """

        try:
            image = self._load_image(file_data)

            image = self._to_grayscale(image)
            image = self._denoise(image)
            image = self._enhance_contrast(image)
            image = self._deskew(image)

            return self._to_png_bytes(image)

        except PreprocessingError:
            raise

        except Exception as exc:
            raise PreprocessingError(
                "Failed to preprocess document."
            ) from exc

    @staticmethod
    def _load_image(file_data: bytes) -> np.ndarray:
        """
        Decode image bytes into an OpenCV image.
        """

        if not file_data:
            raise PreprocessingError(
                "Cannot preprocess empty file."
            )

        try:
            image = Image.open(BytesIO(file_data)).convert("RGB")
        except Exception as exc:
            raise PreprocessingError(
                "Unable to decode image."
            ) from exc

        return cv2.cvtColor(
            np.array(image),
            cv2.COLOR_RGB2BGR,
        )

    @staticmethod
    def _to_grayscale(image: np.ndarray) -> np.ndarray:
        """
        Convert image to grayscale.
        """

        return cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

    @staticmethod
    def _denoise(image: np.ndarray) -> np.ndarray:
        """
        Reduce image noise while preserving text edges.
        """

        return cv2.GaussianBlur(
            image,
            (3, 3),
            0,
        )

    @staticmethod
    def _enhance_contrast(image: np.ndarray) -> np.ndarray:
        """
        Improve local contrast using CLAHE.

        CLAHE is useful for documents photographed under
        uneven lighting.
        """

        clahe = cv2.createCLAHE(
            clipLimit=2.0,
            tileGridSize=(8, 8),
        )

        return clahe.apply(image)

    @staticmethod
    def _deskew(image: np.ndarray) -> np.ndarray:
        """
        Correct small rotations in scanned or photographed documents.
        """

        coordinates = np.column_stack(
            np.where(image < 200)
        )

        if len(coordinates) < 20:
            return image

        angle = cv2.minAreaRect(coordinates)[-1]

        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        if abs(angle) < 0.5:
            return image

        height, width = image.shape[:2]

        center = (width // 2, height // 2)

        rotation_matrix = cv2.getRotationMatrix2D(
            center,
            angle,
            1.0,
        )

        return cv2.warpAffine(
            image,
            rotation_matrix,
            (width, height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )

    @staticmethod
    def _to_png_bytes(image: np.ndarray) -> bytes:
        """
        Encode the processed image as PNG bytes.
        """

        success, encoded = cv2.imencode(
            ".png",
            image,
        )

        if not success:
            raise PreprocessingError(
                "Failed to encode preprocessed image."
            )

        return encoded.tobytes()