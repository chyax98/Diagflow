// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
    diagram_type: string;
    diagram_name: string;
    diagram_code: string;
    svg_content: string;
    error_message: string | null;
    is_loading: boolean;
    retry_count: number;
    last_modified: number;
}
