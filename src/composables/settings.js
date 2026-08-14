/**
 * Created by Ryan Balieiro on 03.02.2025
 */
export function useSettings() {
    /**
     * @return {boolean}
     */
    const getLoaderEnabled = () => {
        return false
    }

    /**
     * @return {{publicKey: string, serviceId: string, templateId: string}}
     */
    const getCredentialsForEmailJS = () => {
        return {
            publicKey: "tzObcsmOwHvPy6Rhp",
            serviceId: "service_4h8g7vb",
            templateId: "template_react"
        }
    }

    return {
        getLoaderEnabled,
        getCredentialsForEmailJS
    }
}
