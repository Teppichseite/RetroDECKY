import { Button, ModalRoot, ModalRootProps, showModal, findSP } from "@decky/ui";
import { useEffect, useState } from "react";
import { FileSelectionType, openFilePicker } from "@decky/api";
import { GameEvent } from "../interfaces";
import { PdfViewerModal } from "./viewers/pdf-viewer";
import { TextViewerModal } from "./viewers/text-viewer";
import { ButtonItemIconContent } from "./shared";
import { getIconPath } from "../utils";
import { listCustomDocumentsBe, copyFileToCustomDocumentsBe } from "../backend";
import { FaPlus } from "react-icons/fa";
import { t, tx } from "../i18n";

export interface DocumentListModalProps extends ModalRootProps {
  gameEvent: GameEvent;
  onClose?: () => void;
}

type FileType = "pdf" | "txt";

interface DocumentItem {
  path: string;
  name: string;
  isMainManual: boolean;
  fileType: FileType;
}

const dialogButtonStyle = { marginBottom: "20px" } as const;

export const DocumentListModal = (props: DocumentListModalProps) => {
  const [customDocuments, setCustomDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await listCustomDocumentsBe(
        props.gameEvent.system_name,
        props.gameEvent.path
      );
      setCustomDocuments(docs);
    } catch (error) {
      console.error("Error loading custom documents:", error);
      setCustomDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [props.gameEvent.system_name, props.gameEvent.path]);

  const getDocumentName = (path: string): string => {
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || path;
  };

  const getFileType = (path: string): FileType => {
    const lowerPath = path.toLowerCase();
    if (
      lowerPath.endsWith(".txt") ||
      lowerPath.endsWith(".md") ||
      lowerPath.endsWith(".markdown")
    ) {
      return "txt";
    }
    return "pdf";
  };

  const documents: DocumentItem[] = [];

  customDocuments.forEach((docPath) => {
    documents.push({
      path: docPath,
      name: getDocumentName(docPath),
      isMainManual: false,
      fileType: getFileType(docPath),
    });
  });

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
  };

  const handleDocumentClick = (
    documentPath: string,
    documentName: string,
    fileType: FileType
  ) => {
    props.closeModal?.();

    if (fileType === "txt") {
      showModal(
        <TextViewerModal
          txtPath={documentPath}
          title={documentName}
          onClose={props.onClose}
        />,
        findSP()
      );
    } else {
      showModal(
        <PdfViewerModal
          pdfPath={documentPath}
          title={documentName}
          onClose={props.onClose}
        />,
        findSP()
      );
    }
  };

  const handleAddDocument = async () => {
    setIsAddingDocument(true);
    try {
      const result = await openFilePicker(
        FileSelectionType.FILE,
        "/home/deck",
        true,
        true,
        () => true,
        ["pdf", "txt", "md", "markdown"]
      );

      if (result && result.path) {
        const documentName = getDocumentName(result.path);

        await copyFileToCustomDocumentsBe(
          result.path,
          props.gameEvent.system_name,
          props.gameEvent.path,
          documentName
        );

        await loadDocuments();
      }
    } catch (error) {
      console.error("Error adding document:", error);
    } finally {
      setIsAddingDocument(false);
    }
  };

  return (
    <ModalRoot onCancel={handleClose}>
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            columnGap: "10px",
          }}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              alt={t("documents.iconAlt")}
              src={getIconPath("RD-user-red-home")}
              width={42}
              height={42}
            />
          </div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "20px",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {t("documents.title", { game: props.gameEvent.name })}
          </div>
        </div>

        {isLoading ? (
          <div style={{ marginBottom: "20px" }}>
            <strong>{t("documents.loading")}</strong>
          </div>
        ) : documents.length === 0 ? (
          <div
            style={{
              marginBottom: "20px",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {tx("documents.empty", {
              none: <strong>{t("documents.none")}</strong>,
              add: <strong>{t("documents.add")}</strong>,
            })}
          </div>
        ) : (
          documents.map((doc, index) => (
            <Button
              key={doc.path}
              className="DialogButton Secondary"
              style={{
                ...dialogButtonStyle,
                marginTop: index === 0 ? "20px" : undefined,
              }}
              onClick={() => handleDocumentClick(doc.path, doc.name, doc.fileType)}
            >
              <ButtonItemIconContent
                icon={
                  <img
                    alt={doc.fileType === "txt" ? "TXT" : "PDF"}
                    src={getIconPath("RD-text-x-generic")}
                    width={24}
                    height={24}
                  />
                }
              >
                {doc.name}
              </ButtonItemIconContent>
            </Button>
          ))
        )}

        <Button
          className="DialogButton Secondary"
          style={{ marginBottom: "20px", marginTop: "20px" }}
          onClick={handleAddDocument}
          disabled={isAddingDocument}
        >
          <ButtonItemIconContent icon={<FaPlus />}>
            {isAddingDocument ? t("documents.adding") : t("documents.add")}
          </ButtonItemIconContent>
        </Button>
      </>
    </ModalRoot>
  );
};
