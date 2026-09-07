from PIL import Image
from io import BytesIO

from app.services.preprocessing import DocumentPreprocessor


def create_test_image() -> bytes:
    image = Image.new(
        "RGB",
        (1200, 800),
        "white",
    )

    buffer = BytesIO()

    image.save(
        buffer,
        format="PNG",
    )

    return buffer.getvalue()


def test_preprocess_image():
    preprocessor = DocumentPreprocessor()

    input_data = create_test_image()

    output_data = preprocessor.preprocess(
        input_data
    )

    assert output_data
    assert output_data.startswith(b"\x89PNG")