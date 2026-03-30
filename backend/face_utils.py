from deepface import DeepFace
import numpy as np

def get_embedding(image_path):
    embedding = DeepFace.represent(
        img_path=image_path,
        model_name="Facenet",
        enforce_detection=True
    )
    return np.array(embedding[0]["embedding"])

def compare_embeddings(e1, e2):
    distance = np.linalg.norm(e1 - e2)
    return distance < 10   # threshold
