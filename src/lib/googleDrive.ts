export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Uploads a JSON backup payload directly to the user's Google Drive.
 */
export async function uploadJsonToDrive(
  fileName: string,
  jsonData: any,
  accessToken: string
): Promise<DriveUploadResult> {
  const metadata = {
    name: fileName,
    mimeType: "application/json",
    description: "Backup completo do sistema Geranium Orgânicos",
  };

  const jsonContent = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    jsonContent +
    closeDelim;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro no Google Drive (${response.status}): ${errorText}`);
  }

  return await response.json();
}
