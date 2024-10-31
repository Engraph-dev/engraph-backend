// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
export const ContentTypes = {
	PNG: "image/png",
	JPEG: "image/jpeg",
	MP3: "audio/mpeg",
	GIF: "image/gif",
	MP4: "video/mp4",
	PDF: "application/pdf",
	TXT: "text/plain",
	CSV: "text/csv",
	ODT: "application/vnd.oasis.opendocument.text",
	ODS: "application/vnd.oasis.opendocument.spreadsheet",
	ODP: "application/vnd.oasis.opendocument.presentation",
	DOC: "application/msword",
	DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	PPT: "application/vnd.ms-powerpoint",
	PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	XLS: "application/vnd.ms-excel",
	XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const

export type ContentType = (typeof ContentTypes)[keyof typeof ContentTypes]

type ContentTypeGroup = "Document" | "Picture" | "Video" | "Audio"

export const ContentTypeGroups: Record<ContentTypeGroup, ContentType[]> = {
	Document: [
		ContentTypes.DOC,
		ContentTypes.DOCX,
		ContentTypes.PPT,
		ContentTypes.PPTX,
		ContentTypes.XLS,
		ContentTypes.XLSX,
		ContentTypes.CSV,
		ContentTypes.ODT,
		ContentTypes.ODS,
		ContentTypes.ODP,
		ContentTypes.PDF,
		ContentTypes.TXT,
	],
	Picture: [ContentTypes.JPEG, ContentTypes.PNG, ContentTypes.GIF],
	Video: [ContentTypes.MP4],
	Audio: [ContentTypes.MP3],
}

export const ACCEPT_S3_CONTENT_TYPES = Object.values(ContentTypes)
