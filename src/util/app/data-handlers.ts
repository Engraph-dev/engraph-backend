import { createCuid, createMiniCuid } from "@/util/app"
import type { ContentType } from "@/util/config/media"
import { IRequest } from "@/util/http"
import { IS_OBJECT_URL, isValidationSuccess } from "@/util/http/validators"

const splitCharsRegex = /[\s\W]+/g

export function generateTokenArrFromString(inputString: string) {
	const splitTokens = inputString.trim().split(splitCharsRegex)
	const cleanedTokens = splitTokens.map((splitTok) => {
		return splitTok.trim().toLowerCase()
	})
	const filteredTokens = cleanedTokens.filter((cleanedTok) => {
		return cleanedTok.length > 0
	})
	const tokenSet = new Set(filteredTokens)
	return Array.from(tokenSet)
}

export async function matchUrlWithContentTypes(
	targetUrl: string,
	contentTypes: ContentType[],
	req: IRequest,
) {
	const objectUrlValidator = IS_OBJECT_URL({
		contentTypes: contentTypes,
	})

	let validationResult = await objectUrlValidator(targetUrl, req)

	return isValidationSuccess(validationResult)
}

export enum IdentSuffixType {
	// 25-character wide CUID
	Cuid,
	// 
	MiniCuid,
	None,
}

export function generateIdentifierFromString(
	inputString: string,
	identSuffix: string | IdentSuffixType = IdentSuffixType.Cuid,
): string {
	const stringTokens = generateTokenArrFromString(inputString)

	const cuidMapping: Record<IdentSuffixType, string> = {
		[IdentSuffixType.Cuid]: `-${createCuid()}`,
		[IdentSuffixType.MiniCuid]: `-${createMiniCuid()}`,
		[IdentSuffixType.None]: "",
	}

	if (typeof identSuffix !== "string") {
		identSuffix = cuidMapping[identSuffix]
	} else {
		identSuffix = `-${identSuffix}`
	}

	return stringTokens.join("-") + `${identSuffix}`
}
