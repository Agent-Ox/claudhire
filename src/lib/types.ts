export type Profile = {
  id?: string
  username: string
  full_name: string
  email: string
  location?: string
  role?: string
  bio?: string
  about?: string
  availability?: string
  github_url?: string
  x_url?: string
  linkedin_url?: string
  website_url?: string
  verified?: boolean
  published?: boolean
}

export type Project = {
  id?: string
  profile_id?: string
  title: string
  description?: string
  prompt_approach?: string
  outcome?: string
  project_url?: string
  display_order?: number
}

export type Skill = {
  id?: string
  profile_id?: string
  category: string
  name: string
}

