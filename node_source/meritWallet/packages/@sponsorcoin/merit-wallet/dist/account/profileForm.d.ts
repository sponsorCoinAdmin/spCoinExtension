export type ProfileField = 'name' | 'symbol' | 'email' | 'website' | 'description';
export interface ProfileFormData {
    name: string;
    symbol: string;
    email: string;
    website: string;
    description: string;
}
export type ProfileFormErrors = Partial<Record<ProfileField, string>>;
export declare const PROFILE_FIELDS: ProfileField[];
export declare const EMPTY_PROFILE: ProfileFormData;
export declare const FIELD_MAX_LENGTHS: Record<ProfileField, number>;
/** The avatar the hosted app stores: 400 x 400 PNG, at most 500 KB, from an input of at most 25 MB. */
export declare const LOGO_TARGET_PX = 400;
export declare const LOGO_MAX_OUTPUT_BYTES: number;
export declare const LOGO_MAX_INPUT_BYTES: number;
export declare function isValidEmail(value: string): boolean;
export declare function isValidWebsite(value: string): boolean;
export declare function validateProfileField(field: ProfileField, rawValue: string): string | null;
export declare function validateProfile(values: ProfileFormData): ProfileFormErrors;
export declare function trimProfile(data: ProfileFormData): ProfileFormData;
export declare function profileChanged(a: ProfileFormData, b: ProfileFormData): boolean;
