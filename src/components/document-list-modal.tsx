import { ButtonItem, ModalRoot, ModalRootProps, showModal, findSP } from "@decky/ui";
import { useEffect, useState } from "react";
import { FileSelectionType, openFilePicker } from "@decky/api";
import { GameEvent } from "../interfaces";
import { PdfViewerModal } from "./viewers/pdf-viewer";
import { TextViewerModal } from "./viewers/text-viewer";
import { ButtonItemIconContent } from "./shared";
import { getIconPath } from "../utils";
import { listCustomDocumentsBe, copyFileToCustomDocumentsBe } from "../backend";
import { FaPlus } from "react-icons/fa";

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

export const DocumentListModal = (props: DocumentListModalProps) => {
    const [customDocuments, setCustomDocuments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingDocument, setIsAddingDocument] = useState(false);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const docs = await listCustomDocumentsBe(props.gameEvent.system_name, props.gameEvent.path);
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
        // Extract filename from path (handle both Unix and Windows paths)
        const parts = path.replace(/\\/g, "/").split("/");
        return parts[parts.length - 1] || path;
    };


    const getFileType = (path: string): FileType => {
        const lowerPath = path.toLowerCase();
        if (lowerPath.endsWith('.txt') || lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) {
            return 'txt';
        }
        return 'pdf'; // Default to pdf
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

    const handleDocumentClick = (documentPath: string, documentName: string, fileType: FileType) => {
        props.closeModal?.();

        if (fileType === 'txt') {
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

                // Refresh the document list
                await loadDocuments();
            }
        } catch (error) {
            console.error("Error adding document:", error);
        } finally {
            setIsAddingDocument(false);
        }
    };

    return (
        <ModalRoot
            onCancel={() => {
                props.closeModal?.();
                props.onClose?.();
            }}
        >
            <div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: "12px",
                        marginBottom: "20px",
                    }}
                >
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                        <img
                            alt="Manual"
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
                        Documents for {props.gameEvent.name}
                    </div>
                </div>

                <div>
                    {isLoading ? (
                        <div style={{ marginBottom: "20px", marginTop: "20px" }}>
                            <strong>Loading documents...</strong>
                        </div>
                    ) : documents.length === 0 ? (
                        <div style={{ marginBottom: "20px", marginTop: "20px" }}>
                            <strong>No documents available.</strong> Click <strong>Add Document</strong> to add a PDF, TXT, or Markdown document.
                        </div>
                    ) : (
                        documents.map((doc, index) => (
                            <ButtonItem
                                key={index}
                                layout="below"
                                onClick={() => handleDocumentClick(doc.path, doc.name, doc.fileType)}
                            >
                                <ButtonItemIconContent
                                    icon={
                                        <img
                                            alt={doc.fileType === 'txt' ? "TXT" : "PDF"}
                                            src={getIconPath("RD-text-x-generic")}
                                            width={24}
                                            height={24}
                                        />
                                    }
                                >
                                    {doc.name}
                                </ButtonItemIconContent>
                            </ButtonItem>
                        ))
                    )}
                    <ButtonItem
                        layout="below"
                        onClick={handleAddDocument}
                        disabled={isAddingDocument}
                    >
                        <ButtonItemIconContent icon={<FaPlus />}>
                            {isAddingDocument ? "Adding..." : "Add Document"}
                        </ButtonItemIconContent>
                    </ButtonItem>
                </div>
            </div>
        </ModalRoot>
    );
};

