// Test rapide pour voir ce qui est retourné
const formData = new FormData();
console.log("FormData keys:", Array.from(formData.keys()));
console.log("FormData has pageGroups:", formData.has("pageGroups"));
console.log("FormData get pageGroups:", formData.get("pageGroups"));
