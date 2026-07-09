import { collection, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Crop } from "../types";

export const DEFAULT_CROPS: Crop[] = [
  { nome: "Abacate", cientifico: "Persea americana", dias: 0, duracao: 0 },
  { nome: "Abóbora itália", cientifico: "Cucurbita pepo", dias: 35, duracao: 40 },
  { nome: "Abóbora menina", cientifico: "Cucurbita moschata", dias: 90, duracao: 30 },
  { nome: "Açafrão", cientifico: "Curcuma longa", dias: 240, duracao: 60 },
  { nome: "Acelga", cientifico: "Beta vulgaris var. cicla", dias: 60, duracao: 50 },
  { nome: "Agrião", cientifico: "Nasturtium officinale", dias: 35, duracao: 25 },
  { nome: "Agrião da terra", cientifico: "Barbarea verna", dias: 40, duracao: 30 },
  { nome: "Alface Americana", cientifico: "Lactuca sativa var. capitata", dias: 35, duracao: 30 },
  { nome: "Alface Crespa roxa", cientifico: "Lactuca sativa var. crispa", dias: 35, duracao: 30 },
  { nome: "Alface Crespa verde", cientifico: "Lactuca sativa var. crispa", dias: 35, duracao: 30 },
  { nome: "Alface Lisa", cientifico: "Lactuca sativa", dias: 35, duracao: 30 },
  { nome: "Alface Mimosa roxa", cientifico: "Lactuca sativa", dias: 45, duracao: 30 },
  { nome: "Alface Mimosa verde", cientifico: "Lactuca sativa", dias: 45, duracao: 30 },
  { nome: "Alface Romana", cientifico: "Lactuca sativa var. longifolia", dias: 35, duracao: 30 },
  { nome: "Alho-porró", cientifico: "Allium ampeloprasum", dias: 60, duracao: 45 },
  { nome: "Almeirão", cientifico: "Cichorium intybus", dias: 60, duracao: 40 },
  { nome: "Beterraba", cientifico: "Beta vulgaris L.", dias: 75, duracao: 30 },
  { nome: "Brócolis Japonês", cientifico: "Brassica oleracea var. italica", dias: 75, duracao: 40 },
  { nome: "Brócolis ramoso", cientifico: "Brassica oleracea var. italica", dias: 60, duracao: 50 },
  { nome: "Cebolinha", cientifico: "Allium fistulosum", dias: 60, duracao: 90 },
  { nome: "Cenoura", cientifico: "Daucus carota", dias: 90, duracao: 30 },
  { nome: "Chicória", cientifico: "Cichorium intybus", dias: 50, duracao: 35 },
  { nome: "Coentro", cientifico: "Coriandrum sativum", dias: 30, duracao: 20 },
  { nome: "Couve", cientifico: "Brassica oleracea var. acephala", dias: 60, duracao: 120 },
  { nome: "Couve crespa", cientifico: "Brassica oleracea var. sabellica", dias: 60, duracao: 100 },
  { nome: "Rabanete", cientifico: "Raphanus sativus", dias: 25, duracao: 15 },
  { nome: "Rúcula", cientifico: "Eruca sativa", dias: 35, duracao: 25 },
  { nome: "Salsa", cientifico: "Petroselinum crispum", dias: 60, duracao: 100 },
  { nome: "Tomate Lili", cientifico: "Solanum lycopersicum", dias: 100, duracao: 90 },
];

export async function seedDatabaseIfEmpty() {
  try {
    const cropsCol = collection(db, "crops");
    const snapshot = await getDocs(cropsCol);
    
    if (snapshot.empty) {
      console.log("Seeding crops database with default organic cultures...");
      const batch = writeBatch(db);
      DEFAULT_CROPS.forEach((crop) => {
        const docRef = doc(cropsCol);
        batch.set(docRef, crop);
      });
      await batch.commit();
      console.log("Crops seeding completed!");
    }

    const metadataCol = collection(db, "metadata");
    const metaSnapshot = await getDocs(metadataCol);
    if (metaSnapshot.empty) {
      console.log("Seeding system metadata/certifications...");
      await setDoc(doc(metadataCol, "geranium"), {
        seloValidade: "2026-04-03",
        seloVisita: "2025-12-12"
      });
      console.log("Metadata seeding completed!");
    }
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}
